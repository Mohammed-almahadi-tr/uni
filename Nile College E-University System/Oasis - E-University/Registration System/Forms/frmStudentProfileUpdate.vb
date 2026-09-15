Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmStudentProfileUpdate
    Public File As Integer
    Public SNo As Integer

    Sub loadstudent()
        Try
            Me.Cursor = Cursors.WaitCursor
            '
            Dim cmd As New SqlCommand("Select StudentName,Program,PhoneNo,Address,IsNull(Batch,'') Batch,TuitionFees1,Nationality,Type,TypeAd From StudentsProfilees " & _
                                      "Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn1)
            Dim Reader As SqlDataReader

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read

                Me.txtStdName.Text = Reader.Item("StudentName")
                Me.CombProgram.Text = Reader.Item("Program")
                Me.txtStdPhone.Text = Reader.Item("PhoneNo")
                Me.txtStdAddress.Text = Reader.Item("Address")
                Me.CombBatch.Text = Reader.Item("Batch")
                Me.txtTutionFee.Text = Reader.Item("TuitionFees1")
                Me.combNationality.Text = Reader.Item("Nationality")
                Me.CombType.Text = Reader.Item("Type")
                Me.CmbAdmiTyp.Text = Reader.Item("TypeAd")
            End While
            cnn1.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Sub
    Sub FillNationality()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.combNationality.Items.Clear()
            Dim cmd As New SqlCommand("select Nationality From Nationalities where Nationality Is Not Null", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.combNationality.Items.Add(reader.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub printFile(ByVal File As Integer)
        Try

            Dim dap As New SqlDataAdapter("select * from StudentsProfilees Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)

            Dim das As New DataSet2
            Dim dt As New DataTable
            dap.Fill(dt)
            ' dap.Fill(das, "Result")
            Dim rpt As New StdFile
            'rpt.SetDataSource(das.Tables("Result"))
            rpt.SetDataSource(dt)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Private Sub frmUpdateStudentProfile_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillProgram()
        FillBatch()
        ' loadstudent()
        FillNationality()
    End Sub

    Sub FillProgram()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombProgram.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct ProgramName From Programs", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombProgram.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillBatch()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.CombBatch.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Batch From AcademicYear Where Batch Is Not Null", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombBatch.Items.Add(rdr.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmListBatches
        a.Show()
        FillBatch()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Clear()
    End Sub
    Sub Clear()
        Me.txtStdIndex.Clear()
        Me.txtStdName.Clear()
        Me.CombProgram.SelectedIndex = -1
        Me.CombBatch.SelectedIndex = -1
        Me.combNationality.SelectedIndex = -1
        Me.txtStdPhone.Clear()
        Me.txtStdAddress.Clear()
        Me.txtWrittenValue.Clear()
        Me.txtTutionFee.Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStdIndex.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdIndex, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombProgram.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombProgram, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombBatch.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBatch, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtStdPhone.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdPhone, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtStdAddress.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdAddress, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTutionFee.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTutionFee, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.combNationality.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.combNationality, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("update StudentsProfilees set studentName=@studentName,Program=@Program," & _
                                      "Batch=@Batch,PhoneNo=@PhoneNo,Address=@Address,TuitionFees1=@TuitionFees1,Nationality=@Nationality,TypeAd=@TypeAd,Type=@Type,Employee=@Employee" & _
                                      " Where StudentIndex=" & Me.txtStdIndex.Text.Trim, cnn)

            cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
            cmd.Parameters.AddWithValue("@Program", Me.CombProgram.SelectedItem)
            cmd.Parameters.AddWithValue("@Batch", Me.CombBatch.Text.Trim)
            cmd.Parameters.AddWithValue("@PhoneNo", Me.txtStdPhone.Text.Trim)
            cmd.Parameters.AddWithValue("@Address", Me.txtStdAddress.Text.Trim)
            cmd.Parameters.AddWithValue("@TuitionFees1", Me.txtTutionFee.Text.Trim)
            cmd.Parameters.AddWithValue("@Nationality", Me.combNationality.Text.Trim)
            cmd.Parameters.AddWithValue("@TypeAd", Me.CmbAdmiTyp.Text.Trim)
            cmd.Parameters.AddWithValue("@Type", Me.CombType.Text.Trim)
            cmd.Parameters.AddWithValue("@Employee", CurrentUser)
            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            MsgBox("تم التعديل")
            printFile(File)
            Me.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtTutionFee_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTutionFee.TextChanged
        Try
            ErrProvider.Clear()
            If Me.txtTutionFee.Text.Trim.Length = 0 Then
                Me.txtWrittenValue.Clear()
            ElseIf IsNumeric(Me.txtTutionFee.Text) = False Then
                ErrProvider.SetError(Me.txtTutionFee, "يجب إدخال أرقام فقط")
            Else
                Me.txtWrittenValue.Text = ChangeTo(CDbl(Me.txtTutionFee.Text)).ToString
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("جنيها ", "جنيه سوداني ")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("(", "")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace(")", "")
            End If
        Catch ex As Exception

        End Try
    End Sub

    Private Sub txtStdPhone_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStdPhone.TextChanged
        ErrProvider.Clear()
        If IsNumeric(Me.txtStdPhone.Text) = False Then
            ErrProvider.SetError(Me.txtStdPhone, "رقم هاتف خاطئ")
            Exit Sub
        End If
    End Sub

    Private Sub Button3_Click_1(sender As System.Object, e As System.EventArgs) Handles Button3.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStdIndex.Text = SelStudID
        loadstudent()
    End Sub

    Private Sub txtStdIndex_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtStdIndex.TextChanged
        loadstudent()
    End Sub
End Class