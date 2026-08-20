Imports System.Data.SqlClient

Public Class frmFinRegestration

    Sub FillStudentRegisteration()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.ListView1.Items.Clear()

            Dim cmd As New SqlCommand("Select SNo,Program,Class,AcademicYear,TuitionFees1,RegsFees,IsNull(DiscPerc,''),IsNull(DiscDescr,'') " & _
                                      "From StudentsRegistration Where StudentIndex=N'" & _
                                      Me.txtStdIndex.Text & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .SubItems.Add(Reader.Item(3))
                    .SubItems.Add(CDbl(Reader.Item(4)).ToString("N2"))
                    .SubItems.Add(CDbl(Reader.Item(5)).ToString("N2"))
                    .SubItems.Add(Reader.Item(6))
                    .SubItems.Add(Reader.Item(7))
                End With
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

    Private Function ValidateRegisteration() As Boolean
        Try
            Dim cmd As New SqlCommand("Select Count(*) From StudentsRegistration Where " & _
                                      "AcademicYear=N'" & Me.CombAcdYear.Text.Trim & "' and StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn1)
            Dim X As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            cnn1.Close()

            If X = True Then
                MsgBox("الطالب غير مسجل لهذا العام من قبل")
                Return True
            End If

            Return False
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.CombAcdYear.Items.Clear()

            Dim cmd As New SqlCommand("select  distinct AcdYear From AcademicYear where AcdYear Is Not Null ", cnn)
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
    Sub FillLevel()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct ProgramLevel From Programs where ProgramName=N'" & Me.txtProgram.Text & _
                                      "' and ProgramLevel Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.combLevel.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.combLevel.Items.Add(Reader.Item(0))
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

            Dim cmd As New SqlCommand("select StudentName,StudentName,Program,Batch,IsNull(dbo.GetProgramFees(Program,N'" & Me.txtBatch.Text & "'),0) Fees, " & _
                                      "IsNull(dbo.GetProgramRegFees(Program,N'" & Me.txtBatch.Text & "'),0) RegFees from StudentsProfiles where StudentIndex=N'" & _
                                      Me.txtStdIndex.Text & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                ' Me.txtStdIndex.Text = Reader.Item("StudentIndex")
                Me.txtStdName.Text = Reader.Item("StudentName")
                Me.txtProgram.Text = Reader.Item("Program")
                Me.txtBatch.Text = Reader.Item("Batch")
            End While
            Reader.Close()
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

    Sub FillFees()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Program,IsNull(dbo.GetProgramFees(Program,N'" & Me.txtBatch.Text & "'),0) Fees" & _
                                     ",IsNull(dbo.GetProgramRegFees(Program,N'" & Me.txtBatch.Text & "'),0) RegFees From StudentsProfiles where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtTuitionFees.Text = CDbl(reader.Item("Fees")).ToString("N2")
                Me.txtRegFees.Text = CDbl(reader.Item("RegFees")).ToString("N2")
                Me.txtDiscountPerc.Text = 0
            End While
            cnn.Close()


        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub Clear()
        Me.txtRegFees.Clear()
        Me.txtTuitionFees.Clear()
        Me.txtDiscountPerc.Value = 0
        Me.CombAcdYear.SelectedIndex = -1
        Me.txtDiscDescr.Clear()
        Me.txtTuitionFeesafterdiscount.Clear()
        Me.txtStdName.Clear()
        Me.txtStdIndex.Clear()
        Me.txtProgram.Clear()
        Me.txtBatch.Clear()
        Me.combLevel.SelectedIndex = -1
    End Sub

    Private Sub frmFinRegestration_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAcdYear()
    End Sub
    Private Sub txtStdIndex_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStdIndex.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
            FillStudentRegisteration()
            FillFees()
            FillLevel()
        End If
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdName, "الرجاء مراجعة البيانات")
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
        ElseIf Me.combLevel.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.combLevel, "الرجاء مراجعة البيانات")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                'If ValidateRegisteration() = False Then
                '    Me.Cursor = Cursors.Default
                '    Exit Sub
                'End If

                Dim MoveNo As Integer
                Dim i As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim Descr As String = "تسجيل للعام الدراسي البرنامج (" & Me.txtProgram.Text.Trim & ") للعام الدراسي (" & Me.CombAcdYear.Text.Trim & ")"
                Dim Totalfees, Tutfees, Regfees As Double
                Tutfees = CDbl(Me.txtTuitionFeesafterdiscount.Text)
                Regfees = CDbl(Me.txtRegFees.Text)
                Totalfees = Tutfees + Regfees

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans


                cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactions Where Year(TransDate)=Year(GetDate())"
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Adding a record in Registeration table
                ''cmd.CommandText = "Insert Into StudentsRegistration (StudentIndex,StudentName,Program,AcademicYear,Batch,Class,TuitionFees1,RegsFees,DiscPerc,DiscDescr) " & _
                ''                        "Values (@StudentIndex,@StudentName,@Program,@AcademicYear,@Batch,@Class,@TuitionFees1,@RegsFees,@DiscPerc,@DiscDescr)"
                ''cmd.Parameters.Clear()
                ''cmd.Parameters.AddWithValue("@StudentIndex", Me.txtStdIndex.Text.Trim)
                ''cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                ''cmd.Parameters.AddWithValue("@Program", Me.txtProgram.Text.Trim)
                ''cmd.Parameters.AddWithValue("@AcademicYear", Me.CombAcdYear.Text.Trim)
                ''cmd.Parameters.AddWithValue("@Batch", Me.txtBatch.Text.Trim)
                ''cmd.Parameters.AddWithValue("@Class", Me.combLevel.Text.Trim)
                ''cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.txtTuitionFeesafterdiscount.Text.Trim))
                ''cmd.Parameters.AddWithValue("@RegsFees", CDbl(Me.txtRegFees.Text.Trim))
                ''cmd.Parameters.AddWithValue("@DiscPerc", Me.txtDiscountPerc.Text)
                ''cmd.Parameters.AddWithValue("@DiscDescr", Me.txtDiscDescr.Text)
                ''cmd.ExecuteNonQuery()

                'Recording debit side for student
                cmd.CommandText = "Insert Into Transactions (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueOut,UserName) " & _
                                         "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',@Acc4,@StudID,@StudName,@TotalValueOut,@UserName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueOut", Totalfees)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                'Recording credit side for student(Tuition Fees)
                cmd.CommandText = "Insert Into Transactions (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName) " & _
                                         "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@TotalValueIn,@UserName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueIn", Tutfees)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()


                'Recording credit side for student(Registeration Fees)
                cmd.CommandText = "Insert Into Transactions (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName) " & _
                                         "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Registration Fees',@Acc4,@TotalValueIn,@UserName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueIn", Regfees)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                MsgBox("تم الحفظ")

                FillStudentRegisteration()

                'Clear
                Me.txtDiscountPerc.Value = 0
                Me.txtDiscDescr.Clear()
                Me.txtTuitionFeesafterdiscount.Clear()
                Me.CombAcdYear.SelectedIndex = -1
                Me.combLevel.SelectedIndex = -1

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStdIndex.Text = SelStudID
        Me.txtStdName.Text = SelStudName
        Me.txtProgram.Text = SelProgram

        FillStudDetails()
        FillStudentRegisteration()
        FillFees()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        Me.ListView1.Items.Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub btnAdd_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnAdd.Click
        Try
            Dim Str As String = InputBox("الرجاء إدخال رمز العام")

            If Trim(Str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into AcademicYear (AcdYear) Values(N'" & Str & "')", cnn)
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
            MsgBox(ex.ToString)
        End Try

    End Sub

    Private Sub txtDiscountPerc_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtDiscountPerc.ValueChanged
        Try
            Dim Fees, Discount, NetFeesValue As Double
            Fees = CDbl(Me.txtTuitionFees.Text)
            Discount = CDbl(Me.txtDiscountPerc.Text)
            NetFeesValue = Fees - (Discount * Fees / 100)

            Me.txtTuitionFeesafterdiscount.Text = NetFeesValue.ToString("N2")
        Catch ex As Exception
            Me.txtDiscountPerc.Value = 0
        End Try
    End Sub

End Class