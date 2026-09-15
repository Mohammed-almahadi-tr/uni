Imports System.Data.SqlClient
Public Class frmTransferStudent

    Sub FillProgram()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombProgram.Items.Clear()
            Dim cmd As New SqlCommand("select ProgramName From Programs", cnn)
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

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select AcdYear From AcademicYear", cnn)
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
    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StudentName,Program,AcademicYear,TuitionFees1,Remain " & _
                                      "From Registrationees Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim reader As SqlDataReader
            Dim Remain, TuitionFees1 As Double
            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStdName.Text = reader.Item("StudentName")
                Me.txtProgram.Text = reader.Item("Program")
                Me.txtAcdYear.Text = reader.Item("AcademicYear")
                TuitionFees1 = reader.Item("TuitionFees1")
                Remain = reader.Item("Remain")
                Me.txtStdFees.Text = CDbl(TuitionFees1) + CDbl(Remain)

                Me.txtRegsFees.Text = "1,030.00"
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillStdfees()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StudentIndex,StudentName,Program,AcademicYear,TuitionFees1 " & _
                                      "From Registrationees Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStdIndex.Text = reader.Item("StudentIndex")
                Me.txtStdName.Text = reader.Item("StudentName")
                Me.txtProgram.Text = reader.Item("Program")
                Me.txtAcdYear.Text = reader.Item("AcademicYear")
                Me.txtStdFees.Text = reader.Item("TuitionFees1")
                Me.txtRegsFees.Text = "1,030,00"
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
    Private Sub frmTransferStudent_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillProgram()
        FillAcdYear()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStdIndex.Text = SelStudID
        FillStudDetails()
    End Sub

    Private Sub txtStdIndex_KeyUp(ByVal sender As System.Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStdIndex.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStdfees()
        End If
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtStdFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegsFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtRegsFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTuitionfees1.Text.Trim = 0 Then
            Me.ErrProvider.SetError(Me.txtTuitionfees1, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegsfees1.Text.Trim = 0 Then
            Me.ErrProvider.SetError(Me.txtRegsfees1, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Dim MoveNo As Integer
            Dim i As Integer
            Dim cmd As New SqlCommand
            Dim Trans As SqlTransaction
            Dim Descr As String = "تحويل"
            Dim Descr1 As String = "تسجيل للعام الدراسي"
            Dim Totalfees, Tutfees, Regfees, Totalfees1, Tutfees1, Regfees1 As Double

            'Calculate fees for old program
            Tutfees = CDbl(Me.txtStdFees.Text)
            Regfees = CDbl(Me.txtRegsFees.Text)
            Totalfees = Tutfees + Regfees

            'Calculate fees for new program
            Tutfees1 = CDbl(Me.txtTuitionfees1.Text)
            Regfees1 = CDbl(Me.txtRegsfees1.Text)
            Totalfees1 = Tutfees1 + Regfees1

            cnn.Open()
            Trans = cnn.BeginTransaction
            cmd.Connection = cnn
            cmd.Transaction = Trans


            cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactionees Where Year(TransDate)=Year(GetDate())"
            MoveNo = CInt(cmd.ExecuteScalar) + 1

            'Delete the record for old program

            cmd.CommandText = "Delete from Registrationees where StudentIndex=N'" & Me.txtStdIndex.Text & "' and Program=N'" & Me.txtProgram.Text & _
                "' and AcademicYear=N'" & Me.txtAcdYear.Text & "'"
            cmd.ExecuteNonQuery()

            'Update Student profile
            cmd.CommandText = "update StudentsProfilees set Program=@Program Where StudentIndex=@StudentIndex"

            cmd.Parameters.AddWithValue("@StudentIndex", Me.txtStdIndex.Text.Trim)
            cmd.Parameters.AddWithValue("@Program", Me.CombProgram.SelectedItem)
            cmd.ExecuteNonQuery()
           
            'Recording credit side for student(old program)
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueIn,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',@Acc4,@StudID,@StudName,@TotalValueIn,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr)
            cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
            cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
            cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
            cmd.Parameters.AddWithValue("@TotalValueIn", Totalfees)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()

            'Recording debit side for student(Tuition Fees for old program)
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueOut,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@StudID,@StudName,@TotalValueOut,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr)
            cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
            cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text)
            cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
            cmd.Parameters.AddWithValue("@TotalValueOut", Tutfees)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()


            'Recording debit side for student(Registeration Fees for old program)
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueOut,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',N'Registration Fees',@TotalValueOut,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr)
            cmd.Parameters.AddWithValue("@TotalValueOut", Regfees)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()
            '-------------------------------------------------------------------------------------------------------------------------------------------------------------------
            'Adding a record in Registeration table
            cmd.CommandText = "Insert Into Registrationees (StudentIndex,StudentName,Program,AcademicYear,TuitionFees1) " & _
                                    "Values (@StudentIndex,@StudentName,@Program,@AcademicYear,@TuitionFees1)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@StudentIndex", Me.txtStdIndex.Text.Trim)
            cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
            cmd.Parameters.AddWithValue("@Program", Me.CombProgram.SelectedItem)
            cmd.Parameters.AddWithValue("@AcademicYear", Me.CombAcdYear.Text)
            cmd.Parameters.AddWithValue("@TuitionFees1", Me.txtTuitionfees1.Text.Trim)
            cmd.Parameters.AddWithValue("@RegsFees", Me.txtRegsfees1.Text.Trim)

            cmd.ExecuteNonQuery()

            'Recording debit side for student
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueOut,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',@Acc4,@StudID,@StudName,@TotalValueOut,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr1)
            cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
            cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
            cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
            cmd.Parameters.AddWithValue("@TotalValueOut", Totalfees1)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()

            'Recording credit side for student(Tuition Fees)
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@TotalValueIn,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr1)
            cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
            cmd.Parameters.AddWithValue("@TotalValueIn", Tutfees1)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()


            'Recording credit side for student(Registeration Fees)
            cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName) " & _
                                     "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',N'Registration Fees',@TotalValueIn,@UserName)"
            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
            cmd.Parameters.AddWithValue("@Descr", Descr1)
            cmd.Parameters.AddWithValue("@TotalValueIn", Regfees1)
            cmd.Parameters.AddWithValue("@UserName", CurrentUser)
            cmd.ExecuteNonQuery()

            Trans.Commit()
            cnn.Close()

            MsgBox("تم الحفظ")

            Clear()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub clear()
        Me.txtStdIndex.Clear()
        Me.txtStdName.Clear()
        Me.txtProgram.Clear()
        Me.txtStdFees.Clear()
        Me.txtRegsFees.Clear()
        Me.txtAcdYear.Clear()
        Me.CombProgram.SelectedIndex = -1
        Me.CombAcdYear.SelectedIndex = -1
        Me.txtTuitionfees1.Clear()
        Me.txtRegsfees1.Clear()
    End Sub

    Private Sub txtStdIndex_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStdIndex.TextChanged
        Me.txtStdName.Clear()
        Me.txtProgram.Clear()
        Me.txtStdFees.Clear()
        Me.txtRegsFees.Clear()
        Me.txtAcdYear.Clear()
        FillStudDetails()
    End Sub
    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub
End Class