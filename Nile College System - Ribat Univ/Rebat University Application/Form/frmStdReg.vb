Imports System.Data.SqlClient
Imports System.Net.Mail

Public Class frmStdReg

    Sub Clear()
        Me.txtName.Clear()
        Me.CombCollege.SelectedIndex = -1
        Me.CombBatch.SelectedIndex = -1
        Me.txtTele.Clear()
        Me.txtAdderess.Clear()
        Me.txtName.Focus()
        Me.txtDiscountPerc.Clear()
        Me.txtDiscDescr.Clear()
        Me.txtRegFees.Clear()
        Me.txtTuitionFees.Clear()
        Me.CombAcdYear.SelectedIndex = -1
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombCollege.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombCollege, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombBatch.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBatch, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTele.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTele, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtAdderess.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAdderess, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTuitionFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTuitionFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtRegFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcdYear.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Insert Into StdFinancial (StdName,College,Batch,Tele,Address)" & _
                                      "Values (N'" & Me.txtName.Text & "',N'" & Me.CombCollege.SelectedItem & _
                                      "',N'" & Me.CombBatch.SelectedItem & "',N'" & Me.txtTele.Text & _
                                      "',N'" & Me.txtAdderess.Text & "')", cnn)

            Dim cmdSelID As New SqlCommand("Select Max(StdID) From StdFinancial", cnn)
            Dim StudID As Integer

            cnn.Open()
            cmd.ExecuteNonQuery()
            StudID = CStr(cmdSelID.ExecuteScalar)
            Dim cmd1 As New SqlCommand("Insert Into Transactions (Descr,StudID,StudName,College,Batch,AcdYear" & _
                                     ",TuitionFees,RegFees,DiscPerc,DiscDescr,TotalValueOut,CurrentUser) " & _
                                   "Values (N'تسجيل للعام الدراسي'," & StudID & ",N'" & _
                                   Me.txtName.Text.Trim & "',N'" & Me.CombCollege.SelectedItem & _
                                   "',N'" & Me.CombBatch.SelectedItem & "',N'" & Me.CombAcdYear.SelectedItem & _
                                   "'," & Me.txtTuitionFees.Text.Trim & "," & Me.txtRegFees.Text.Trim & _
                                   ",N'" & Me.txtDiscountPerc.Text & " %',N'" & Me.txtDiscDescr.Text & "'," & _
                                   CDbl(CDbl(Me.txtTuitionFees.Text.Trim) + CDbl(Me.txtRegFees.Text.Trim)) & _
                                   ",N'" & CurrentUser & "')", cnn)
            cmd1.ExecuteNonQuery()
            cnn.Close()

            MsgBox("تم الحفظ" & vbCrLf & "رقم الطالب: " & StudID)

            Clear()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Sub FillColleges()
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillBatches()
        Try
            Dim BatchList As New ArrayList
            BatchList = GetBatchesList()

            For Each BatchName As String In BatchList
                Me.CombBatch.Items.Add(BatchName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From AcdYear", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
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

    Private Sub frmStdReg_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillColleges()
        FillBatches()
        FillAcdYear()
    End Sub

    Sub GetFees()
        Try
            If Me.CombBatch.SelectedIndex = -1 OrElse Me.CombCollege.SelectedIndex = -1 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select TuitionFees,RegFees " & _
                                    "From CollegeFees Where College=N'" & Me.CombCollege.SelectedItem & _
                                    "' and Batch=N'" & Me.CombBatch.SelectedItem & "'", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtFixedFees.Text = reader.Item("TuitionFees")
                Me.txtTuitionFees.Text = reader.Item("TuitionFees")
                Me.txtRegFees.Text = reader.Item("RegFees")
                Me.txtDiscountPerc.Text = 0
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

    Private Sub CombCollege_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombCollege.SelectedIndexChanged
        GetFees()
    End Sub

    Private Sub CombBatch_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombBatch.SelectedIndexChanged
        GetFees()
    End Sub

    Private Sub txtDiscountPerc_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtDiscountPerc.TextChanged
        If Me.txtFixedFees.Text.Trim.Length = 0 Then
            Me.txtTuitionFees.Clear()
            Exit Sub
        ElseIf Me.txtDiscountPerc.Text.Trim.Length = 0 Then
            Me.txtTuitionFees.Clear()
            Exit Sub
        ElseIf Me.txtDiscountPerc.Text = "100" Then
            Me.txtTuitionFees.Text = Me.txtFixedFees.Text
            Exit Sub
        ElseIf Me.txtDiscountPerc.Text = 0 Then
            Me.txtTuitionFees.Text = Me.txtFixedFees.Text
        Else
            Try
                Dim Fees, Discount, DiscoutValue As Double
                Fees = CDbl(Me.txtFixedFees.Text)
                Discount = CDbl(Me.txtDiscountPerc.Text)
                DiscoutValue = Discount * Fees / 100

                Me.txtTuitionFees.Text = DiscoutValue
            Catch ex As Exception
                Me.txtTuitionFees.Clear()
                Me.txtDiscountPerc.Clear()
            End Try
        End If
    End Sub

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDept.Click
        Try
            Dim Str As String = InputBox("الرجاء إدخال رمز العام")

            If Trim(Str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into AcdYear (AcdYear) Values(N'" & Str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAcdYear()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub
End Class