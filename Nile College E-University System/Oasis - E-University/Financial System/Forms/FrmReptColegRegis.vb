
Imports System.Data.SqlClient

Public Class FrmReptColegRegis

    Private Sub frmRptCollegesRegStudents_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillProgram()
        FillAcdYear()
    End Sub
    Sub FillLevel()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct ProgramLevel From Programs where ProgramName=N'" & Me.CombPrograms.Text.Trim & _
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

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click

        Me.ErrorProvider1.Clear()
        If Me.combLevel.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.combLevel, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcdYear.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombPrograms.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombPrograms, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombSemester.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombSemester, "الرجاء مراجعة البيانات")
            Exit Sub

        Else

            Try

                Me.Cursor = Cursors.WaitCursor

                Dim dap As New SqlDataAdapter("Select StudentIndex,StudentName,Colleges,AcademicYear,Class,Batch,TuitionFees1,Remain From Registrationees " & _
                                              "Where Colleges=N'" & Me.CombPrograms.SelectedItem & "' AND Class=N'" & Me.combLevel.Text & "' AND " & _
                                              "AcademicYear=N'" & Me.CombAcdYear.Text & "' AND Batch=N'" & Me.CombSemester.Text & "'", cnn1)
                Dim das As New DataSet
                das.Clear()

                cnn1.Open()
                dap.Fill(das, "Registrationees")
                cnn1.Close()

                Dim rpt As New ProgramStudReg

                rpt.SetDataSource(das)
                Me.CrystalReportViewer1.ReportSource = rpt

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn1.State = ConnectionState.Open Then
                    cnn1.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Sub FillProgram()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombPrograms.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Colleges From Registrationees", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombPrograms.Items.Add(rdr.Item(0))
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

    Private Sub CombPrograms_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombPrograms.SelectedIndexChanged
        FillLevel()
    End Sub

End Class